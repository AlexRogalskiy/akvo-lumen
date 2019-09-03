import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';

import EntityTypeHeader from '../entity-editor/EntityTypeHeader';
import ConfirmUserAction from './ConfirmUserAction';
import InviteUser from './InviteUser';
import User from './User';
import * as api from '../../utilities/api';
import { showNotification } from '../../actions/notification';

require('../entity-editor/EntityTypeHeader.scss');
require('./Users.scss');

function UserList({
  currentUserEmail, getUserActions, invitationMode, onChange, users,
}) {
  return (
    <table>
      <tbody>
        <tr>
          {!invitationMode && (
            <th />
          )}
          {!invitationMode && (
            <th><FormattedMessage id="first_name" /></th>
          )}
          {!invitationMode && (
            <th><FormattedMessage id="last_name" /></th>
          )}
          <th><FormattedMessage id="email" /></th>
          {!invitationMode && (
            <th>
              <FormattedMessage id="role" />
            </th>
          )}
          <th>
            <FormattedMessage id="actions" />
          </th>
        </tr>
        {users.map(({
          admin, email, id, firstName, lastName,
        }) => (
          <User
            getUserActions={getUserActions}
            key={id}
            onChange={onChange}
            invitationMode={invitationMode}
            user={{
              currentUser: email === currentUserEmail,
              admin,
              email,
              id,
              firstName,
              lastName,
            }}
          />
        ))}
      </tbody>
    </table>
  );
}

UserList.propTypes = {
  currentUserEmail: PropTypes.string.isRequired,
  getUserActions: PropTypes.func.isRequired,
  invitationMode: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  users: PropTypes.array.isRequired,
};

class Users extends Component {
  constructor(props) {
    super(props);
    this.state = {
      userAction: {
        action: '',
        user: {
          email: '', id: '', firstName: '', lastName: '',
        },
      },
      invitationMode: false,
      invitations: [],
      isActionModalVisible: false,
      isInviteModalVisible: false,
      users: [],
    };
    this.getUserActions = this.getUserActions.bind(this);
    this.getUserActionButtons = this.getUserActionButtons.bind(this);
    this.getInvitations = this.getInvitations.bind(this);
    this.getUsers = this.getUsers.bind(this);
    this.handleUserAction = this.handleUserAction.bind(this);
    this.handleUserActionSelect = this.handleUserActionSelect.bind(this);
    this.onInviteUser = this.onInviteUser.bind(this);
  }

  componentDidMount() {
    if (this.props.profile.admin) {
      this.getInvitations();
      this.getUsers();
    }
  }

  onInviteUser(email) {
    this.setState({ isInviteModalVisible: false });
    api.post('/api/admin/invites', { email })
      .then(() => this.getInvitations())
      .catch(() => {
        this.props.dispatch(showNotification('error', 'Failed to invite user.'));
      });
  }

  getUsers() {
    api.get('/api/admin/users')
      .then(({ body: { users } }) => this.setState({ users }))
      .catch(() => {
        this.props.dispatch(showNotification('error', 'Failed to fetch users.'));
      });
  }

  getInvitations() {
    api.get('/api/admin/invites')
      .then(({ body: { invites } }) => this.setState({ invitations: invites }))
      .catch(() => {
        this.props.dispatch(showNotification('error', 'Failed to fetch invitations.'));
      });
  }

  getUserActionButtons() {
    const invitationMode = this.state.invitationMode;
    const buttons = [
      {
        buttonText: invitationMode ? 'Manage users' : 'Manage invitations',
        onClick: () => this.setState({ invitationMode: !invitationMode }),
      },
      {
        buttonText: 'Invite user',
        onClick: () => this.setState({ isInviteModalVisible: true }),
      },
    ];
    return invitationMode ? buttons : [buttons[0]];
  }

  getUserActions(user) {
    const { currentUser, admin } = user;
    let actions = [];
    if (this.state.invitationMode) {
      actions = [['revoke', 'Revoke invitation', false]];
    } else {
      actions = [
        ['delete', 'Delete user', currentUser],
      ];
      if (admin) {
        actions.push(['demote', 'Revoke admin privileges', (!admin || currentUser)]);
      } else {
        actions.push(['promote', 'Enable admin privileges', admin]);
      }
    }
    return actions;
  }

  handleUserActionSelect(user, action) {
    this.setState({
      isActionModalVisible: true,
      userAction: { action, user },
    });
  }

  handleUserAction() {
    const { action, user } = this.state.userAction;
    const { id } = user;
    this.setState({ isActionModalVisible: false });
    const usersUrl = `/api/admin/users/${id}`;
    const invitesUrl = `/api/admin/invites/${id}`;
    if (action === 'delete') {
      api.del(usersUrl)
        .then(() => this.getUsers())
        .catch(() => {
          this.props.dispatch(showNotification('error', `Failed to ${action} user.`));
        });
    } else if (action === 'demote') {
      api.patch(usersUrl, { admin: false })
        .then(() => this.getUsers())
        .catch(() => {
          this.props.dispatch(showNotification('error', `Failed to ${action} user.`));
        });
    } else if (action === 'promote') {
      api.patch(usersUrl, { admin: true })
        .then(() => this.getUsers())
        .catch(() => {
          this.props.dispatch(showNotification('error', `Failed to ${action} user.`));
        });
    } else if (action === 'revoke') {
      api.del(invitesUrl)
        .then(() => this.getInvitations())
        .catch(() => {
          this.props.dispatch(showNotification('error', `Failed to ${action} user.`));
        });
    }
  }

  render() {
    const actionButtons = this.getUserActionButtons();
    const { admin, email } = this.props.profile;
    const saveStatus = '';
    const invitationMode = this.state.invitationMode;
    const title = invitationMode ? 'Invitations' : 'Members';
    if (!admin) {
      return (
        <div>
          <p>You need to be an admin user to view and invite other users.</p>
        </div>
      );
    }

    return (
      <div className="UsersContainer">
        <EntityTypeHeader
          title={title}
          saveStatus={saveStatus}
          actionButtons={actionButtons}
        />
        <div className="UserList">
          <UserList
            currentUserEmail={email}
            getUserActions={this.getUserActions}
            onChange={this.handleUserActionSelect}
            invitationMode={invitationMode}
            users={invitationMode ? this.state.invitations : this.state.users}
          />
        </div>
        <InviteUser
          isOpen={this.state.isInviteModalVisible}
          onClose={() => this.setState({ isInviteModalVisible: false })}
          onInviteUser={this.onInviteUser}
        />
        <ConfirmUserAction
          isOpen={this.state.isActionModalVisible}
          onChange={this.handleUserAction}
          onClose={() => this.setState({ isActionModalVisible: false })}
          userAction={this.state.userAction}
        />
      </div>
    );
  }
}

Users.propTypes = {
  profile: PropTypes.shape({
    admin: PropTypes.bool,
    email: PropTypes.string.isRequired,
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,
  }).isRequired,
  dispatch: PropTypes.func.isRequired,
};

Users.defaultProps = {
  profile: {
    admin: false,
    firstName: '',
    lastName: '',
  },
};

export default connect(state => ({
  profile: state.profile,
}))(Users);
